using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Хачатрян_задание2
{
    public partial class Form1 : Form
    {
        double a = 0;            // первый операнд
        double b = 0;            // второй операнд
        string operation = "+";  // выбранная операция

        public Form1()
        {
            InitializeComponent();
        }

        private void Form1_Load(object sender, EventArgs e)
        {
            // Рисунки в imageList берутся из ресурсов проекта (все 128x128).
            // У imageList1 ImageSize = 128x128 и ColorDepth = 32 бита,
            // если оставить по умолчанию 16x16 и 8 бит, то картинки растягиваются и искажаются.
            imageList1.Images.Add(Properties.Resources.cat);
            imageList1.Images.Add(Properties.Resources.dog);
            imageList1.Images.Add(Properties.Resources.owl);
            imageList1.Images.Add(Properties.Resources.fish);

            pictureBox1.Image = imageList1.Images[0];
            Calculate();
        }

        // ---------------- Задача 1 ----------------

        // Ввод числа с умолчанием: если не парсится, то 0.
        private double ReadNumber(TextBox tb)
        {
            double x;
            if (double.TryParse(tb.Text, out x) == false)
                x = 0;
            return x;
        }

        // Каждое поле отвечает только за свой операнд.
        private void textBox1_TextChanged(object sender, EventArgs e)
        {
            a = ReadNumber(textBox1);
            Calculate();
        }

        private void textBox2_TextChanged(object sender, EventArgs e)
        {
            b = ReadNumber(textBox2);
            Calculate();
        }

        // Один обработчик на все радиокнопки операций.
        private void radioButtonOperation_CheckedChanged(object sender, EventArgs e)
        {
            RadioButton rb = (RadioButton)sender;
            if (rb.Checked == true)
            {
                operation = rb.Text;
                Calculate();
            }
        }

        // Пересчет результата при любом изменении данных.
        private void Calculate()
        {
            double res = 0;
            switch (operation)
            {
                case "+":
                    res = a + b;
                    break;
                case "-":
                    res = a - b;
                    break;
                case "*":
                    res = a * b;
                    break;
                case "/":
                    if (b == 0)
                    {
                        textBox3.Text = "на 0 делить нельзя";
                        return;
                    }
                    res = a / b;
                    break;
            }
            textBox3.Text = res.ToString();
        }

        // ---------------- Задача 2 ----------------

        // Один обработчик на все радиокнопки картинок, номер картинки лежит в Tag.
        private void radioButtonPicture_CheckedChanged(object sender, EventArgs e)
        {
            RadioButton rb = (RadioButton)sender;
            if (rb.Checked == true)
            {
                int n = Convert.ToInt32(rb.Tag);
                pictureBox1.Image = imageList1.Images[n];
            }
        }
    }
}

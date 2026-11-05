using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Хачатрян_задание9
{
    public partial class DialogEdit : Form
    {
        public DialogEdit()
        {
            InitializeComponent();
        }

        private void DialogEdit_Load(object sender, EventArgs e)
        {
            // Показать, что получено из главной формы.
            textBox1.Text = Form1.Rec.Name;
            dateTimePicker1.Value = Form1.Rec.Birthday;
            textBox2.Text = Form1.Rec.Profession;
            listBox1.SelectedItem = Form1.Rec.Department;
            textBox3.Text = Form1.Rec.Money.ToString();
        }

        // Ввод оклада с умолчанием: если не парсится, то 0.
        private double ReadMoney()
        {
            double x;
            if (double.TryParse(textBox3.Text, out x) == false || x < 0)
                x = 0;
            return x;
        }

        // ОК
        private void button1_Click(object sender, EventArgs e)
        {
            if (!String.IsNullOrEmpty(textBox1.Text) && !String.IsNullOrEmpty(textBox2.Text) && !String.IsNullOrEmpty(textBox3.Text))
            {
                Record Tmp = new Record(textBox1.Text, dateTimePicker1.Value.Date, textBox2.Text,
                                        listBox1.SelectedItem.ToString(), ReadMoney());
                Form1.Rec = Tmp;   // измененная запись передается основной форме
                DialogResult = DialogResult.OK;
            }
            else
            {
                var result = MessageBox.Show("Не заполнены поля.\nОК - вернуться к вводу, Отмена - закрыть окно.", "Проверка",
                                             MessageBoxButtons.OKCancel, MessageBoxIcon.Information);
                if (result == DialogResult.Cancel)
                    DialogResult = DialogResult.Cancel;
            }
        }

        // Отмена
        private void button2_Click(object sender, EventArgs e)
        {
            DialogResult = DialogResult.Cancel;
        }
    }
}

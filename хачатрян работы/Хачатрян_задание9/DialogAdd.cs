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
    public partial class DialogAdd : Form
    {
        public DialogAdd()
        {
            InitializeComponent();
        }

        private void DialogAdd_Load(object sender, EventArgs e)
        {
            listBox1.SelectedIndex = 0;
        }

        private double ReadMoney()
        {
            double x;
            if (double.TryParse(textBox3.Text, out x) == false || x < 0)
                x = 0;
            return x;
        }

        private void button1_Click(object sender, EventArgs e)
        {
            if (!String.IsNullOrEmpty(textBox1.Text) && !String.IsNullOrEmpty(textBox2.Text) && !String.IsNullOrEmpty(textBox3.Text))
            {
                Record Tmp = new Record(textBox1.Text, dateTimePicker1.Value.Date, textBox2.Text,
                                        listBox1.SelectedItem.ToString(), ReadMoney());
                Form1.Rec = Tmp;
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

        private void button2_Click(object sender, EventArgs e)
        {
            DialogResult = DialogResult.Cancel;
        }
    }
}
